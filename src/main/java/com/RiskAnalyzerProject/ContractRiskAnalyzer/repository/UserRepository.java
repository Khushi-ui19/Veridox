package com.RiskAnalyzerProject.ContractRiskAnalyzer.repository;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    @Query("{ 'username' : { $regex: ?0, $options: 'i' } }")
    Optional<User> findByUsername(String username);
    @Query(value = "{ 'email' : { $regex: ?0, $options: 'i' } }", exists = true)
    boolean existsByUsername(String username);

    @Query("{ 'email' : { $regex: ?0, $options: 'i' } }")
    Optional<User> findByEmail(String email);
    @Query(value = "{ 'username' : { $regex: ?0, $options: 'i' } }", exists = true)
    Boolean existsByEmail(String email);

}
